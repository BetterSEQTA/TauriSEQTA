#[path = "utils/netgrab.rs"]
mod netgrab;
#[path = "utils/session.rs"]
mod session;

/// Other imports
use tauri::Manager;
use std::collections::HashMap;

/// Boilerplate example command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// True if a saved login session exists.
#[tauri::command]
fn check_session_exists() -> bool {
    session::Session::exists()
}

/// Persist the SEQTA `base_url` and `JSESSIONID`.
#[tauri::command]
fn save_session(base_url: String, cookies: HashMap<String, String>) -> Result<(), String> {
    session::Session { base_url, cookies }
        .save()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn logout() -> bool {
    if let Ok(_) = crate::session::Session::clear() {
        true
    } else {
        false
    }
}

/// Open a login window and harvest the cookie once the user signs in.
#[tauri::command]
async fn create_login_window(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri::{WebviewWindowBuilder, WebviewUrl};
    use tokio::time::{sleep, Duration};

    // Spawn the login window
    WebviewWindowBuilder::new(
        &app, 
        "seqta_login", 
        WebviewUrl::External(url.parse().map_err(|e| format!("Invalid URL: {}", e))?)
    )
        .title("SEQTA Login")
        .inner_size(900.0, 700.0)
        .build()
        .map_err(|e| format!("Failed to build window: {}", e))?;

    // Clone handles for async block
    let app_handle_clone = app.clone();

    // Start polling in a background task
    tauri::async_runtime::spawn(async move {
        for _ in 0..30 { // Poll for 30 seconds max
            // Wait 1 second between polls
            sleep(Duration::from_secs(1)).await;

            // Try to get cookies from the login window
            if let Some(webview) = app_handle_clone.get_webview_window("seqta_login") {
                match webview.cookies() {
                    Ok(cookies) => {
                        let mut my_map = HashMap::new();
                        println!("Cookies: {:?}", cookies);
                        for cookie in cookies {
                            my_map.insert(cookie.name().to_string(), cookie.value().to_string());
                        }
                        println!(stringify!(my_map));
                        let base_url = url.clone();
                        let session = crate::session::Session {
                            base_url,
                            cookies: my_map,
                        };

                        if let Err(err) = session.save() {
                            eprintln!("Failed to save session: {}", err);
                        }

                        // Close login window
                        let _ = webview.close();
                        return; // Stop polling once found
                    }
                    Err(err) => {
                        eprintln!("Error retrieving cookies: {}", err);
                    }
                }
            }
        }

        eprintln!("JSESSIONID not found within timeout");
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            netgrab::get_api_data,
            netgrab::post_api_data,
            netgrab::fetch_api_data,
            check_session_exists,
            save_session,
            create_login_window,
            logout
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}