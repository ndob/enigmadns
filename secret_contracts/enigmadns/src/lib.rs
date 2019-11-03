#![no_std]
use eng_wasm::{eformat, eprint, read_state, write_state, String, ToString};
use eng_wasm_derive::pub_interface;
use serde::{Deserialize, Serialize};

// Uses the new interface style:
// https://blog.enigma.co/secret-contracts-now-new-and-improved-df742393d6d8

#[derive(Serialize, Deserialize)]
struct DomainInfo {
    domain: String, // redundant.
    owner: String,
    target: String,
}

#[repr(i32)]
enum ErrorCode {
    None = 0,
    AlreadyRegistered = 1,
    Unauthorized = 2,
}

struct EnigmaDNSContract;

const DOMAIN_PREFIX: &str = "domain_name.";

#[pub_interface]
impl EnigmaDNSContract {
    pub fn register(domain: String, registrant: String /* msg.senderId? */) -> i32 {
        if Self::is_registered(&domain) {
            return ErrorCode::AlreadyRegistered as i32;
        }

        eprint!("Domain available. Continuing registration.");

        let domain_full_key = Self::get_domain_full_key(&domain);

        let new_info = DomainInfo {
            domain: domain,
            owner: registrant,
            target: "na".to_string(),
        };

        write_state!(&domain_full_key => new_info);

        return ErrorCode::None as i32;
    }

    pub fn set_target(
        domain: String,
        target: String,
        registrant: String, /* msg.senderId */
    ) -> i32 {
        let cur_info_maybe = Self::get_info(&domain);
        let mut cur_info = cur_info_maybe.unwrap();

        if cur_info.owner != registrant {
            eprint!("Not the owner");
            return ErrorCode::Unauthorized as i32;
        }

        cur_info.target = target;

        let domain_full_key = Self::get_domain_full_key(&domain);
        write_state!(&domain_full_key => cur_info);

        return ErrorCode::None as i32;
    }

    pub fn resolve(domain: String) -> String {
        match Self::get_info(&domain) {
            Some(info) => {
                return info.target;
            }
            None => {
                return "".to_string();
            }
        }
    }

    fn get_info(domain: &str) -> Option<DomainInfo> {
        let domain_full_key = Self::get_domain_full_key(&domain);
        let cur_info: Option<DomainInfo> = read_state!(&domain_full_key);

        match cur_info {
            Some(_) => {
                eprint!("Domain found, continuing");
            }
            None => {
                eprint!("Domain not registered.");
                return None;
            }
        }

        Some(cur_info.unwrap())
    }

    fn get_domain_full_key(domain: &str) -> String {
        eformat!("{}{}", DOMAIN_PREFIX, &domain)
    }

    fn is_registered(domain: &str) -> bool {
        match Self::get_info(&domain) {
            Some(_) => {
                return true;
            }
            None => {
                return false;
            }
        }
    }
}
