<script src="gallery.html"></script>

<script>
// ACCORDION
const btns = document.querySelectorAll(".gallery-btn");

btns.forEach(btn => {
    btn.addEventListener("click", () => {
        const panel = btn.nextElementSibling;

        // Close other panels
        document.querySelectorAll(".gallery-content").forEach(content => {
            if (content !== panel) content.style.maxHeight = null;
        });

        // Toggle open
        panel.style.maxHeight = panel.style.maxHeight ? null : panel.scrollHeight + "px";
    });
});

// LIGHTBOX
let images = [];
let currentIndex = 0;

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");

document.querySelectorAll(".thumb").forEach((img, index) => {
    img.addEventListener("click", (e) => {
        const group = e.target.parentElement.querySelectorAll(".thumb");
        images = [...group].map(i => i.src);
        currentIndex = Array.from(group).indexOf(e.target);

        showImage();
        lightbox.style.display = "flex";
    });
});

function showImage() {
    lightboxImg.src = images[currentIndex];
}

// NEXT / PREV
document.querySelector(".right").onclick = () => {
    currentIndex = (currentIndex + 1) % images.length;
    showImage();
};

document.querySelector(".left").onclick = () => {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    showImage();
};

// CLOSE
document.getElementById("close-btn").onclick = () => {
    lightbox.style.display = "none";
};

lightbox.onclick = (e) => {
    if (e.target === lightbox) lightbox.style.display = "none";
};
</script>
</body>
</html>
