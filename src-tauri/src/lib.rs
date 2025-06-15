#[cfg(not(any(target_os = "ios", target_os = "android")))]
#[path = "auth/login.rs"]
mod login;

#[cfg(any(target_os = "ios", target_os = "android"))]
#[path = "mobilechanges/login.rs"]
mod login;

#[path = "utils/netgrab.rs"]
mod netgrab;
#[path = "utils/settings.rs"]
mod settings;
#[path = "utils/analytics.rs"]
mod analytics;

use tauri::Manager;
use tauri_plugin_notification;
use tauri_plugin_single_instance;
use urlencoding::decode;

/// Boilerplate example command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init());

    #[cfg(not(any(target_os = "ios", target_os = "android")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            println!("[Desqta] Single instance event: {:?}", argv);
            
            // Handle deep link in single instance
            if let Some(url) = argv.get(1) {
                println!("[Desqta] Processing deep link in single instance: {}", url);
                if url.starts_with("desqta://auth") {
                    // Extract cookie and URL from the deep link
                    let mut cookie = None;
                    let mut base_url = None;
                    
                    // Parse URL parameters
                    if let Some(query) = url.split('?').nth(1) {
                        println!("[Desqta] Query string: {}", query);
                        for param in query.split('&') {
                            println!("[Desqta] Processing parameter: {}", param);
                            if let Some((key, value)) = param.split_once('=') {
                                println!("[Desqta] Found parameter - key: {}, value: {}", key, value);
                                match key {
                                    "cookie" => {
                                        if let Ok(decoded) = decode(value) {
                                            cookie = Some(decoded.to_string());
                                            println!("[Desqta] Decoded cookie: {}", decoded);
                                        } else {
                                            println!("[Desqta] Failed to decode cookie value: {}", value);
                                        }
                                    },
                                    "url" => {
                                        if let Ok(decoded) = decode(value) {
                                            base_url = Some(decoded.to_string());
                                            println!("[Desqta] Decoded URL: {}", decoded);
                                        } else {
                                            println!("[Desqta] Failed to decode URL value: {}", value);
                                        }
                                    },
                                    _ => {
                                        println!("[Desqta] Unknown parameter: {}", key);
                                    }
                                }
                            } else {
                                println!("[Desqta] Invalid parameter format: {}", param);
                            }
                        }
                    } else {
                        println!("[Desqta] No query string found in URL");
                    }
                    
                    // Check if we have both required parameters
                    if let (Some(cookie), Some(base_url)) = (cookie, base_url) {
                        println!("[Desqta] Using base_url: {}", base_url);
                        match login::save_session(base_url, cookie) {
                            Ok(_) => {
                                println!("[Desqta] Successfully saved session from deep link. Check session.json for update.");
                                login::force_reload(app.app_handle().clone());
                            },
                            Err(e) => {
                                eprintln!("[Desqta] Failed to save session from deep link: {}", e);
                            }
                        }
                    } else {
                        eprintln!("[Desqta] Missing required parameters. Need both cookie and URL.");
                    }
                }
            }
        }));
    }

    builder
        .invoke_handler(tauri::generate_handler![
            greet,
            netgrab::get_api_data,
            netgrab::open_url,
            netgrab::get_rss_feed,
            netgrab::post_api_data,
            netgrab::fetch_api_data,
            login::check_session_exists,
            login::save_session,
            login::create_login_window,
            login::logout,
            login::force_reload,
            settings::get_settings,
            settings::save_settings,
            analytics::save_analytics,
            analytics::load_analytics,
            analytics::delete_analytics,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
