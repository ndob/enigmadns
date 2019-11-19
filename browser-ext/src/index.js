import { EnigmaDNS } from "enigmadns-js";
import parseDomain from "parse-domain";

async function redirect(requestDetails) {
    const parsed = parseDomain(requestDetails.url, {
        customTlds: ["enigma"]
    });
    if (parsed && parsed.tld === "enigma") {
        console.log("Resolving domain from Enigma... full url:" + requestDetails.url);
        let resolved = await g_enigmaDNS.resolve(parsed.domain);
        console.log("Rewriting enigma url with resolved address: " + resolved);
        // Not robust, but OK for testing. Fails e.g if
        // https://a.enigma/foo/blaaa.enigma
        const toBeReplaced = parsed.domain + "." + parsed.tld;
        let rewritten = requestDetails.url.replace(toBeReplaced, resolved);
        console.log("Redirecting to:" + rewritten);
        return {
            redirectUrl: rewritten
        };
    }

}

let g_enigmaDNS = new EnigmaDNS();

browser.webRequest.onBeforeRequest.addListener(
    redirect, {
        urls: ["<all_urls>"]
    },
    ["blocking"]
);

