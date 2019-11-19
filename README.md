# enigmadns
DNS service for .enigma addresses

*NOTE*: Current implementation does not do any authorization and there is no registration fee as the Enigma still lacks functionality like msg.sender and two-way communication with Ethereum.

## Components
### 1. enigmadns: DNS implementation on Enigma blockchain as a secret contract.
Implements the backend functionality as an Enigma secret contract. It is possible to:
- Register a domain.
- Change the domain pointer.
- Resolve a domain.

#### Building and running

Install discovery-cli: https://github.com/enigmampc/discovery-cli .

Run:
```
discovery init
discovery start
discovery compile
discovery migrate
```

### 2. client: Admin client for registering and changing the DNS targets.

Currently the following functionality has been implemented:
- Register a domain.
- Change domain pointer.
- Test the domain resolving.

#### Building and running

Run:
```
cd client
npm install
npm start
```

### 3. browser-ext: Browser extension for Firefox that resolves any .enigma addresses.

Has been tested with Firefox 70.

The extension intercepts all page load calls and checks if the target URL is under a .enigma-domain. Then it calls the enigmadns backend to resolve the domain into a raw IP address or a different domain name and replaces the target URL with the resolved address.

#### Building
```
cd browser-ext
npm install
npm run build
```
### Installing
- Open Firefox and navigate to _about:debugging_.
- Select "This Firefox".
- Select "Load temporary add-on" and select browser-ext/addon/manifest.json.
