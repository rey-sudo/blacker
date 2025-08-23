import {EventSource} from "eventsource";

const es = new EventSource("http://localhost:3000/api/slave/get-logs");

es.addEventListener("log", (event) => {
    console.log("Nuevo log:", event.data);
});

es.addEventListener("ready", (event) => {
    console.log("Dump inicial completo:", event.data);
});

es.onerror = (err) => {
    console.error("Error SSE:", err);
};
