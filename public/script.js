const hostname = window.location.hostname;
const protocol = window.location.protocol;
const port = window.location.port;
let portString = "";
if (hostname === "localhost") {
  portString = `:${port}`;
} else {
  portString = "";
}

const testDbLink = document.getElementById("test-db-link");

testDbLink.href = `${protocol}//${hostname}${portString}/api/test-db`;
testDbLink.textContent = `${protocol}//${hostname}${portString}/api/test-db`;
