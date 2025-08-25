import {EventSource} from "eventsource";

const es = new EventSource("https://x.ngrok-free.app/api/slave/slave-0/get-logs");

es.addEventListener("log", (event) => {
    console.log(event.data);
});

es.addEventListener("ready", (event) => {
    console.log(event.data);
});

es.onerror = (err) => {
    console.error(err);
};
