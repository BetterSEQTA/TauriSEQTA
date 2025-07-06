use reqwest;
use reqwest::Client;
use rss::Channel;
use serde::{Deserialize, Serialize};
use xmltree::{Element, XMLNode};
use serde_json::{json, Value};
use std::{io::Cursor};
use std::collections::HashMap;
use anyhow::{Result, anyhow};
use url::Url;

use base64::{engine::general_purpose, Engine as _};
// opens a file using the default program:

use crate::session;

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
    POST,
}

/// Build an HTTP client with headers based on the saved session.
fn create_client() -> reqwest::Client {
    let session = session::Session::load();
    let mut headers = reqwest::header::HeaderMap::new();

    // Build the complete cookie string with JSESSIONID and additional cookies
    let mut cookie_parts = Vec::new();

    // Add JSESSIONID first if it exists
    if !session.jsessionid.is_empty() {
        cookie_parts.push(format!("JSESSIONID={}", session.jsessionid));
    }

    // Add all additional cookies
    for cookie in session.additional_cookies {
        cookie_parts.push(format!("{}={}", cookie.name, cookie.value));
    }

    // Set the combined cookie header if we have any cookies
    if !cookie_parts.is_empty() {
        headers.insert(
            reqwest::header::COOKIE,
            cookie_parts.join("; ").parse().unwrap(),
        );
    }

    headers.insert(
        reqwest::header::USER_AGENT,
        "Mozilla/5.0 (DesQTA)".parse().unwrap(),
    );
    headers.insert(
        reqwest::header::ACCEPT,
        "application/json, text/plain, */*".parse().unwrap(),
    );
    headers.insert(
        reqwest::header::ACCEPT_LANGUAGE,
        "en-US,en;q=0.9".parse().unwrap(),
    );

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
    is_image: bool,
    return_url: bool
) -> Result<String, String> {
    let client = create_client();
    let session = session::Session::load();
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
        if is_image == true {
            // Get the bytes (await and ? to bubble up errors)
            let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
            // Encode to base64
            let base64_str = general_purpose::STANDARD.encode(&bytes);
            Ok(base64_str)
        }
        else if return_url == true {
            Ok(String::from(resp.url().as_str()))
        }
        else {
            let text = resp.text().await.map_err(|e| e.to_string())?;
            Ok(text)
        }
    }
    Err(e) => Err(format!("HTTP request failed: {e}")),
}
}

#[tauri::command]
pub async fn get_api_data(
    url: &str,
    parameters: HashMap<String, String>,
) -> Result<String, String> {
    fetch_api_data(url, RequestMethod::GET, None, None, Some(parameters), false, false).await
}

#[tauri::command]
pub async fn get_seqta_file(file_type: &str, uuid: &str) -> Result<String, String> {
    let mut params = HashMap::new();
    params.insert(String::from("type"), String::from(file_type));
    params.insert(String::from("file"), String::from(uuid));
    fetch_api_data("/seqta/student/load/file", RequestMethod::GET, None, None, Some(params), false, true).await
}

#[derive(Serialize)]
pub struct FeedItem {
    title: Option<String>,
    link: Option<String>,
    description: Option<String>,
    pub_date: Option<String>,
}
#[derive(Serialize)]
pub struct FeedResponse {
    title: String,
    items: Vec<FeedItem>,
}

#[tauri::command]
pub async fn get_rss_feed(feed: &str) -> Result<Value, String> {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let res = client
        .get(feed)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = res.status();
    let content = res
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    if !status.is_success() {
        return Err(format!(
            "Request failed with status {}. Response body:\n{}",
            status, content
        ));
    }

    let channel = Channel::read_from(content.as_bytes())
        .map_err(|e| format!("Failed to parse RSS feed: {}", e))?;

    let json = channel_to_json(&channel)
        .map_err(|e| format!("Failed to convert to JSON: {}", e))?;

    Ok(json)
}
pub fn channel_to_json(channel: &Channel) -> Result<Value> {
    fn xml_to_json(elem: &Element) -> Value {
        let text = elem.get_text();
        let has_text = text.as_ref().map(|t| !t.trim().is_empty()).unwrap_or(false);

        let has_attrs = !elem.attributes.is_empty();
        let has_children = elem.children.iter().any(|c| matches!(c, XMLNode::Element(_)));

        if !has_attrs && !has_children && has_text {
            return Value::String(text.unwrap().to_string());
        }

        let mut map = serde_json::Map::new();

        if has_attrs {
            map.insert("@attributes".into(), json!(elem.attributes));
        }

        for child in &elem.children {
            if let XMLNode::Element(child_elem) = child {
                let child_json = xml_to_json(child_elem);
                map.entry(child_elem.name.clone())
                    .and_modify(|v| {
                        if let Value::Array(arr) = v {
                            arr.push(child_json.clone());
                        } else {
                            *v = Value::Array(vec![v.take(), child_json.clone()]);
                        }
                    })
                    .or_insert(child_json);
            }
        }

        if has_text {
            map.insert("text".into(), Value::String(text.unwrap().to_string()));
        }

        Value::Object(map)
    }

    let xml_str = channel.to_string();
    let root = Element::parse(Cursor::new(xml_str))
        .map_err(|e| anyhow!("Failed to parse XML: {}", e))?;

    let mut root_json = xml_to_json(&root);

    // Parse item elements into feeds array using flexible xml_to_json
    let feeds: Vec<Value> = root
        .get_child("channel")
        .map(|channel_elem| {
            channel_elem
                .children
                .iter()
                .filter_map(|node| {
                    if let XMLNode::Element(child) = node {
                        if child.name == "item" {
                            Some(xml_to_json(child))
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                })
                .collect()
        })
        .unwrap_or_default();

    if let Value::Object(ref mut map) = root_json {
        map.insert("feeds".to_string(), Value::Array(feeds));
    }

    Ok(root_json)
}

/// Open a login window and harvest the cookie once the user signs in.
#[tauri::command]
pub async fn open_url(app: tauri::AppHandle, url: String) -> Result<(), String>{
    use tauri::{WebviewUrl, WebviewWindowBuilder};

    let http_url;

    match url.starts_with("https://") {
        true => http_url = url.clone(),
        false => {
            http_url = format!("https://{}", url.clone());
        }
    }

    let parsed_url = match Url::parse(&http_url) {
        Ok(u) => u,
        Err(e) => return Err(format!("Invalid URL: {}", e))
    };

    let full_url: Url = match Url::parse(&format!("{}", parsed_url)) {
        Ok(u) => u,
        Err(e) => return Err(format!("Invalid URL: {}", e))// Nothing

    };

    // Spawn the login window
    WebviewWindowBuilder::new(&app, "seqta_login", WebviewUrl::External(full_url.clone()))
        .title("SEQTA Login")
        .inner_size(900.0, 700.0)
        .build()
        .map_err(|e| format!("Failed to build window: {}", e))?;
    Ok(())

}

#[tauri::command]
pub async fn post_api_data(
    url: &str,
    data: Value,
    parameters: HashMap<String, String>,
) -> Result<String, String> {
    fetch_api_data(url, RequestMethod::POST, None, Some(data), Some(parameters), false, false).await
}

/// Clear the session data with API call and remove the session file
#[tauri::command]
pub async fn clear_session() -> Result<(), String> {
    // Send logout request first
    let _ = get_api_data("/saml2?logout", HashMap::new()).await;
    
    // Then clear the session file
    session::Session::clear_file().map_err(|e| e.to_string())
}