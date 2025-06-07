use tauri::{Emitter, Manager};
use time::OffsetDateTime;
use url::Url;

#[path = "../utils/session.rs"]
mod session;

#[tauri::command]
pub fn force_reload(app: tauri::AppHandle) {
    app.emit("reload", "hi".to_string()).unwrap();
}

/// True if a saved login session exists.
#[tauri::command]
pub fn check_session_exists() -> bool {
    session::Session::exists()
}

/// Persist the SEQTA `base_url` and `JSESSIONID`.
#[tauri::command]
pub fn save_session(base_url: String, jsessionid: String) -> Result<(), String> {
    session::Session {
        base_url,
        jsessionid,
        additional_cookies: Vec::new(),
    }
    .save()
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn logout() -> bool {
    if let Ok(_) = session::Session::clear() {
        true
    } else {
        false
    }
}

/// Open a login window and harvest the cookie once the user signs in.
#[tauri::command]
pub async fn create_login_window(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri::{WebviewUrl, WebviewWindowBuilder};
    use tokio::time::{sleep, Duration};

    let http_url;

    match url.starts_with("https://") {
        true => http_url = url.clone(),
        false => {
            http_url = format!("https://{}", url.clone());
        }
    }

    let parsed_url = match Url::parse(&http_url) {
        Ok(u) => u,
        Err(e) => {
            return Err(format!("Invalid URL: {}", e));
        }
    };

    let full_url: Url = match Url::parse(&format!("{}/#?page=/welcome", parsed_url)) {
        Ok(u) => u,
        Err(e) => {
            return Err(format!("Parsing error: {}", e));
        }
    };

    // Spawn the login window
    WebviewWindowBuilder::new(&app, "seqta_login", WebviewUrl::External(full_url.clone()))
        .title("SEQTA Login")
        .inner_size(900.0, 700.0)
        .build()
        .map_err(|e| format!("Failed to build window: {}", e))?;

    // Clone handles for async block
    let app_handle_clone = app.clone();

    let mut counter = 0; // Creates a counter so that we don't quit authentication upon the first request (which redirects)
                         // Start polling in a background task
    tauri::async_runtime::spawn(async move {
        for _ in 0..1920 {
            // Poll for 1920 seconds max
            // Wait 1 second between polls
            sleep(Duration::from_secs(1)).await;

            // Construct the full URL with the page parameter

            // Try to get cookies from the login window
            if let Some(webview) = app_handle_clone.get_webview_window("seqta_login") {
                if counter > 0 {
                    // Check if the auth has finished through url
                    match webview.url() {
                        Ok(current_url) => {
                            println!("Current URL from webview: {}", current_url);
                            if !(current_url.to_string().contains("#?page=/welcome")) {
                                continue;
                            }
                        }
                        Err(e) => {
                            eprintln!("Error retrieving URL: {}", e);
                        }
                    }

                    match webview.cookies() {
                        Ok(cookies) => {
                            println!("Cookies: {:?}", cookies);
                            for cookie in cookies.clone() {
                                if cookie.name() == "JSESSIONID"
                                    && cookie.domain().unwrap_or("None")
                                        == parsed_url.host_str().unwrap_or("None")
                                {
                                    if let Some(expire_time) = cookie.expires_datetime() {
                                        let now = OffsetDateTime::now_utc();
                                        if expire_time > now {
                                            let duration = expire_time - now;
                                            println!(
                                                "Cookie is still valid! Expires in {}",
                                                duration
                                            );

                                            let value = cookie.value().to_string();
                                            let base_url = http_url.clone();

                                            // Convert all cookies to our storage format
                                            let additional_cookies = cookies
                                                .iter()
                                                .filter(|c| c.name() != "JSESSIONID") // Skip JSESSIONID as it's stored separately
                                                .filter(|c| {
                                                    if let Some(cookie_domain) = c.domain() {
                                                        if let Some(host) = parsed_url.host_str() {
                                                            host.ends_with(
                                                                cookie_domain
                                                                    .trim_start_matches('.'),
                                                            )
                                                        } else {
                                                            false
                                                        }
                                                    } else {
                                                        false
                                                    }
                                                }) // only include cookies for the same domain
                                                .map(|c| session::Cookie {
                                                    name: c.name().to_string(),
                                                    value: c.value().to_string(),
                                                    domain: c.domain().map(|s| s.to_string()),
                                                    path: c.path().map(|s| s.to_string()),
                                                })
                                                .collect();

                                            // Save session with all cookies
                                            let session = session::Session {
                                                base_url,
                                                jsessionid: value,
                                                additional_cookies,
                                            };

                                            if let Err(err) = session.save() {
                                                eprintln!("Failed to save session: {}", err);
                                            }

                                            let _ = webview.close();
                                            force_reload(app);
                                            return; // Stop polling once found
                                        } else {
                                            println!("Cookie has expired!");
                                        }
                                    }
                                }
                            }
                        }
                        Err(err) => {
                            eprintln!("Error retrieving cookies: {}", err);
                        }
                    }
                }
            }
            counter += 1; // increment the counter at the end of the loop
        }

        eprintln!("JSESSIONID not found within timeout");
    });

    Ok(())
}
