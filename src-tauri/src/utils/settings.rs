use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::{self, Read},
    path::PathBuf,
};

/// Location: `$DATA_DIR/DesQTA/settings.json`
fn settings_file() -> PathBuf {
    let mut dir = dirs_next::data_dir().expect("Unable to determine data dir");
    dir.push("DesQTA");
    if !dir.exists() {
        fs::create_dir_all(&dir).expect("Unable to create data dir");
    }
    dir.push("settings.json");
    dir
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub shortcuts: Vec<Shortcut>,
    pub feeds: Vec<Feed>,
    pub weather_enabled: bool,
    pub weather_city: String,
    pub weather_country: String,
    pub reminders_enabled: bool,
    pub force_use_location: bool,
    pub accent_color: String,
    pub theme: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            shortcuts: Vec::new(),
            feeds: Vec::new(),
            weather_enabled: false,
            force_use_location: false,
            weather_city: String::new(),
            weather_country: String::new(),
            reminders_enabled: true,
            accent_color: "#3b82f6".to_string(), // Default to blue-500
            theme: "dark".to_string(), // Default to dark theme
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Shortcut {
    pub name: String,
    pub icon: String,
    pub url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Feed {
    
    pub url: String,
}

impl Settings {
    /// Load from disk; returns default if none.
    pub fn load() -> Self {
        let path = settings_file();
        if let Ok(mut file) = fs::File::open(path) {
            let mut contents = String::new();
            if file.read_to_string(&mut contents).is_ok() {
                if let Ok(settings) = serde_json::from_str::<Settings>(&contents) {
                    return settings;
                }
            }
        }
        Settings::default()
    }

    /// Persist to disk.
    pub fn save(&self) -> io::Result<()> {
        let path = settings_file();
        fs::write(path, serde_json::to_string(self).unwrap())
    }
}

#[tauri::command]
pub fn get_settings() -> Settings {
    Settings::load()
}

#[tauri::command]
pub fn save_settings(new_settings: Settings) -> Result<(), String> {
    println!("Saving settings: {:?}", new_settings);
    new_settings.save().map_err(|e| e.to_string())
}
