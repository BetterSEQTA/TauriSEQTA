use reqwest;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use serde_json::Value;

use crate::session::Session;

#[derive(Debug, Serialize, Deserialize)]
pub struct HomeworkItem {
    pub meta: i32,
    pub id: i32,
    pub title: String,
    pub items: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HomeworkResponse {
    pub payload: Vec<HomeworkItem>,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum RequestMethod {
    GET,
    POST
}

/// Build an HTTP client with headers based on the saved session.
fn create_client() -> reqwest::Client {
    let session = Session::load();
    let mut headers = reqwest::header::HeaderMap::new();

    if !session.cookies.is_empty() {
        for (key, value) in session.cookies.into_iter() {
            headers.insert(
                reqwest::header::COOKIE,
                format!("{}={}", key, value).parse().unwrap(),
            );
        }

    }

    headers.insert(
        reqwest::header::USER_AGENT,
        "Mozilla/5.0 (TauriSEQTA)".parse().unwrap(),
    );
    headers.insert(
        reqwest::header::ACCEPT,
        "application/json, text/plain, */*".parse().unwrap(),
    );
    headers.insert(reqwest::header::ACCEPT_LANGUAGE, "en-US,en;q=0.9".parse().unwrap());

    if !session.base_url.is_empty() {
        headers.insert(reqwest::header::ORIGIN, session.base_url.parse().unwrap());
        headers.insert(reqwest::header::REFERER, session.base_url.parse().unwrap());
    }

    reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .expect("Failed to create HTTP client")
}

#[tauri::command]
pub async fn fetch_api_data(
    url: &str,
    method: RequestMethod,
    headers: Option<HashMap<String, String>>,
    body: Option<Value>,
    parameters: Option<HashMap<String, String>>,
) -> Result<String, String> {
    let client = create_client();
    let session = Session::load();
    
    let full_url = if url.starts_with("http") {
        url.to_string()
    } else {
        format!("{}{}", session.base_url.parse::<String>().unwrap(), url)
    };

    let mut request = match method {
        RequestMethod::GET => client.get(&full_url),
        RequestMethod::POST => client.post(&full_url),
    };

    // Add custom headers if provided
    if let Some(headers) = headers {
        for (key, value) in headers {
            request = request.header(&key, value);
        }
    }

    // Add query parameters if provided
    if let Some(params) = parameters {
        request = request.query(&params);
    }

    // Add body for POST requests if provided
    if let RequestMethod::POST = method {
        if let Some(body_data) = body {
            request = request.json(&body_data);
        }
    }

    match request.send().await {
        Ok(resp) => {
            let response = resp.text().await.unwrap();
            Ok(response)
        },
        Err(e) => Err(format!("HTTP request failed: {e}")),
    }
}

#[tauri::command]
pub async fn get_api_data(
    url: &str,
    parameters: HashMap<String, String>,
) -> Result<String, String> {
    fetch_api_data(
        url,
        RequestMethod::GET,
        None,
        None,
        Some(parameters)
    ).await
}

#[tauri::command]
pub async fn post_api_data(
    url: &str,
    data: Value,
    parameters: HashMap<String, String>
) -> Result<String, String> {
    fetch_api_data(
        url,
        RequestMethod::POST,
        None,
        Some(data),
        Some(parameters)
    ).await
}