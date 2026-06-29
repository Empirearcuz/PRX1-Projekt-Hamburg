
//Eventlistener für Modal der Images  in Pics
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("modal-img")) {
        const imgSrc = e.target.getAttribute("src");
        document.getElementById("modalImage").src = imgSrc;

        const modal = new bootstrap.Modal(document.getElementById("Modal"));
        modal.show();
    }
});
