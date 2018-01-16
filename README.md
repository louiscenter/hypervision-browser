# Experiment: porting hypervision to the browser
[`hypervision`](https://louis.center/p2p-hypervision) is a desktop application built with `dat` and `electron` that lets you watch and broadcast peer-to-peer live streams. When users connect to a stream, they distribute the data they receive amongst each other. This bypasses the need for a central server, and the huge amount of bandwidth required to deliver the same data to every user.

As `hypervision` is built on top of `electron`, it has access to the `node` runtime, allowing users to connect to each other using protocols like `TCP`, `UDP` and `UTP`. In web browsers like Firefox & Chrome, we don't have access to these tools. We are required to use `WebRTC`, a collection of protocols that allows browsers to connect directly to each other.

This repository is an experiment in porting `hypervision` to the browser, using `WebRTC`.

## Install
Clone this repo to your hard-drive:
```
$ git clone https://github.com/louiscenter/hypervision-browser
```

Install required dependencies:
```
$ npm install
```

Run the development server:
```
$ npm start
```

## Instructions
**NOTE: Please test in *both* Chrome & Firefox. Sometimes one works, and the other doesn't. I'm not sure why.**

Open two tabs inside the same browser, and navigate each to `http://localhost:8080`.

- In one tab, open the `broadcast` page.
- In the other, open the `watch` page.

Make sure to open the devtools console in each tab.

- In the `broadcast` tab, press the `[Start broadcast]` button. Your browser should ask for access to your webcam and microphone. For this to work, you will need to allow access.

- Your broadcast has now begun. Copy the `key` underneath the `[Start broadcast]` button to your clipboard.

- In the `watch` tab, paste the key you just copied into the `Key:` input field, then press the `[Watch broadcast]` button above. This tab will now try connecting to the broadcast in the other tab.

## Current issues
- Joining the swarm can often be unreliable. For this, we are using a `signalhubws` server, which has been installed on a `now.sh` instance to co-ordinate `WebRTC` connections. Connection success rates vary, sometimes because of the browser you're using. I'm not sure why.

- If peer connection is successful, the viewer will tend to download the first and second blocks of the `dat`/`hypercore` feed, and then either timeout before it can download anymore, or just stop working altogether. Once again, I'm very new to `WebRTC`, so I'm unsure as to why. Getting `dat` feeds to replicate between peers using `node` is pretty flawless, but in the browser success has been patchy.

- If successive block downloads are successful, incoming video data should start being appended to a `MediaSource` object. However, I haven't been able to successfully make the `<video>` element on the `watch` page playback. I'm not sure if I'm appending data incorrectly or not.

- Any feedback/ideas regarding the issues above is much appreciated. I'd be lying if I said I really knew what I was doing.

## Resources
- [hypervision for electron](https://github.com/mafintosh/hypervision/)
