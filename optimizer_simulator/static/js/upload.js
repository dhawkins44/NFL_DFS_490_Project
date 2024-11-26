document.addEventListener("DOMContentLoaded", function () {
    const uploadForm = document.getElementById("upload-form");

    if (uploadForm) {
        uploadForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const formData = new FormData(this);
            const submitButton = this.querySelector('button[type="submit"]');

            // Disable submit button and show loading state
            submitButton.disabled = true;
            submitButton.innerHTML =
                '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';

            try {
                const response = await fetch(this.action, {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": document.querySelector(
                            "[name=csrfmiddlewaretoken]"
                        ).value,
                    },
                    body: formData,
                });

                const data = await response.json();

                if (data.success) {
                    // Hide the modal properly
                    const modalElement =
                        document.getElementById("upload-modal");
                    const modal = bootstrap.Modal.getInstance(modalElement);

                    if (modal) {
                        modal.hide();
                        // Wait for modal hide animation to complete
                        setTimeout(() => {
                            // Clean up modal artifacts
                            document
                                .querySelectorAll(".modal-backdrop")
                                .forEach((el) => el.remove());
                            document.body.classList.remove("modal-open");
                            document.body.style.paddingRight = "";

                            // Redirect to the lineups page
                            window.location.href = data.redirect_url;
                        }, 300);
                    } else {
                        window.location.href = data.redirect_url;
                    }
                } else {
                    alert(data.error || "Error uploading files");
                }
            } catch (error) {
                console.error("Upload error:", error);
                alert("Error uploading files: " + error.message);
            } finally {
                // Reset button state
                submitButton.disabled = false;
                submitButton.innerHTML = "Upload Files";
            }
        });
    }
});
