const hostname = window.location.hostname;
const protocol = window.location.protocol;

const testDbLink = document.getElementById("test-db-link");

testDbLink.href = `${protocol}//${hostname}:8080/api/test-db`;
testDbLink.textContent = `${protocol}//${hostname}:8080/api/test-db`;
