function updateName() {
    var url = new URL(window.location.href);
    var name = url.searchParams.get("name") || '';
    var displayName = name.charAt(0).toUpperCase() + name.slice(1);
    document.getElementById('namePlaceholder').textContent = displayName ? `, ${displayName}` : '';
}

function nextPage() {
    window.location.href = "yes.html";
}

function moveButton() {
    var noButton = document.getElementById('noButton');
    var x = Math.random() * (window.innerWidth - noButton.offsetWidth) - 85;
    var y = Math.random() * (window.innerHeight - noButton.offsetHeight) - 48;
    noButton.style.left = `${x}px`;
    noButton.style.top = `${y}px`;
}

window.onload = updateName;