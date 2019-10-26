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

struct EnigmaDNSContract;

const DOMAIN_PREFIX: &str = "domain_name.";

#[pub_interface]
impl EnigmaDNSContract {
    pub fn register(domain: String, registrant: String /* msg.senderId? */) -> String {
        if Self::is_registered(&domain) {
            return "already·exists".to_string();
        }

        eprint!("Domain available. Continuing registration.");

        let domain_full_key = Self::get_domain_full_key(&domain);

        let new_info = DomainInfo {
            domain: domain,
            owner: registrant,
            target: "".to_string(),
        };

        write_state!(&domain_full_key => new_info);

        return "ok".to_string();
    }

    pub fn set_target(domain: String, target: String, registrant: String /* msg.senderId */) {
        let cur_info_maybe = Self::get_info(&domain);
        let mut cur_info = cur_info_maybe.unwrap();

        if cur_info.owner != registrant {
            eprint!("Not the owner");
            return;
        }

        cur_info.target = target;

        let domain_full_key = Self::get_domain_full_key(&domain);
        write_state!(&domain_full_key => cur_info);
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
