use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::{self, Read},
    path::PathBuf,
};

#[path = "../utils/session.rs"]
mod session;

pub fn load() {
    let path = session::session_file().pop();
    
    println!(path);
}