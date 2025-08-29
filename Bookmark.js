define(["qlik", "jquery", "css!./Bookmark.css"], function (qlik, $, css) {
    return {
        paint: function ($element, layout) {
            const app = qlik.currApp();

            // Append popup modal to the body
            if (!document.getElementById("popupModal")) {
                $("body").append(`
                    <div id="popupModal" class="popup-modal">
                        <div class="popup-header">
                            <span>Manage Bookmarks</span>
                            <button id="closePopupBtn" class="close-btn">×</button>
                        </div>
                        <div class="popup-content">
                            <div class="create-bookmark-section">
                                <input type="text" id="bookmarkNameInput" placeholder="Enter bookmark name" />
                                <button id="createBookmarkBtn" class="create-bookmark-btn">Create</button>
                            </div>
                            <div id="popupList" class="popup-list"></div>
                        </div>
                    </div>
                `);
            }

            // Append open popup button to the extension container
            $element.html(`
                <button id="openPopupBtn" class="open-popup-btn">
                    <svg class="create-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#6610f2" viewBox="0 0 16 16">
                        <path d="M2 2v12l6-6 6 6V2z"/>              </svg>                    
                    Bookmarks
                </button>
            `);

            // Open the modal
            $("#openPopupBtn").on("click", () => {
                $("#popupModal").fadeIn();
                loadBookmarks();
            });

            // Close the modal
            $("#closePopupBtn").on("click", () => {
                $("#popupModal").fadeOut();
            });

        // Handle click outside the modals to close base modal only if delete modal is not active
        $(document).on("click", (e) => {
            if (
                !$(e.target).closest("#popupModal, #openPopupBtn").length &&
                !$(e.target).closest("#confirmationModal").length
                ) {
                $("#popupModal").fadeOut(); // Close base modal only
            }
            });

            // Load bookmarks into the popup list
            async function loadBookmarks() {
                try {
                    const bookmarks = await getBookmarks();
                    const $popupList = $("#popupList");
                    $popupList.empty();

                    if (bookmarks.length > 0) {
                        bookmarks.forEach((bookmark) => {
                            const listItem = `
                                <div class="popup-item" data-id="${bookmark.qInfo.qId}">
                                    <span>${bookmark.qData.title}</span>
                                    <button class="delete-bookmark-btn">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="red" class="bi bi-trash" viewBox="0 0 16 16">
                                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5.5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6zm2 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5z"/>
                                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1 0-2h3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1h3a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3a.5.5 0 0 0 0 1H13.5a.5.5 0 0 0 0-1H2.5z"/>
                                        </svg>
                                    </button>
                                </div>`;
                            $popupList.append(listItem);
                        });

                        // Add click event to delete buttons
                        $(".delete-bookmark-btn").on("click", function (e) {
                            e.stopPropagation(); // Prevent triggering parent click
                            const bookmarkId = $(this).parent().data("id");
                            const bookmarkTitle = $(this).siblings("span").text();
                            showModal(`Are you sure you want to delete the bookmark "${bookmarkTitle}"?`, {
                                onConfirm: () => {
                                    app.bookmark.remove(bookmarkId).then(() => {
                                        showModal(`Bookmark "${bookmarkTitle}" deleted!`);
                                        loadBookmarks(); // Reload list
                                    });
                                },
                                showCloseButton: true,
                            });
                        });

                        // Add click event to load bookmarks
                        $(".popup-item").on("click", function () {
                            const bookmarkId = $(this).data("id");
                            app.bookmark.apply(bookmarkId).then(() => {
                                showModal(`Bookmark "${$(this).text()}" loaded successfully!`);
                            });
                        });
                    } else {
                        $popupList.html("<p>No bookmarks available.</p>");
                    }
                } catch (error) {
                    console.error("Error loading bookmarks:", error);
                }
            }

            // Create a new bookmark            
            $("#createBookmarkBtn").off("click").on("click", async () => {
                const bookmarkName = $("#bookmarkNameInput").val().trim();
                if (!bookmarkName) {
                    showModal("Please enter a name for the bookmark.");
                    return;
                }

                try {
                    const bookmarks = await getBookmarks();
                    const duplicate = bookmarks.some(
                        (bookmark) => bookmark.qMeta.title === bookmarkName
                    );
                    if (duplicate) {
                        showModal(`Bookmark "${bookmarkName}" already exists!`);
                        return;
                    }

                    await app.bookmark.create(bookmarkName);
                    showModal(`Bookmark "${bookmarkName}" created!`);
                    loadBookmarks();
                    $("#bookmarkNameInput").val(""); // Clear input
                } catch (error) {
                    console.error("Error creating bookmark:", error);
                    showModal("Failed to create bookmark. Please try again.");
                }
            });

            // Fetch bookmarks from Qlik
            async function getBookmarks() {
                return new Promise((resolve, reject) => {
                    app.getList("BookmarkList", (reply) => {
                        if (reply?.qBookmarkList?.qItems) {
                            resolve(reply.qBookmarkList.qItems);
                        } else {
                            reject("Failed to fetch bookmarks.");
                        }
                    });
                });
            }

// Modal function for showing alerts and confirmation
function showModal(message, options = {}) {
    // Remove existing modal if present
    if (document.getElementById("confirmationModal")) {
        $("#confirmationModal").remove();
    }

    const { onConfirm, showCloseButton = false } = options;

    // Modal HTML structure
    const modalHtml = `
        <div id="confirmationModal" class="confirmation-modal">
            <div class="popup-header">
                <span>${message}</span>
                ${
                    showCloseButton
                        ? '<button id="closeConfirmationModal" class="close-btn">×</button>'
                        : ""
                }
            </div>
            <div class="popup-content">
                ${
                    onConfirm
                        ? `<button id="confirmActionBtn" class="create-bookmark-btn">OK</button>`
                        : ""
                }
            </div>
        </div>`;

    // Append modal to the body
    $("body").append(modalHtml);

    // Show modal
    $("#confirmationModal").fadeIn();

    // Close delete modal when "X" button is clicked
    if (showCloseButton) {
        $("#closeConfirmationModal").on("click", () => {
            $("#confirmationModal").fadeOut(() => {
                $("#confirmationModal").remove(); // Remove delete modal only
            });
        });
    }

    // Confirm action (e.g., delete) when "OK" button is clicked
    if (onConfirm) {
        $("#confirmActionBtn").on("click", () => {
            onConfirm && onConfirm(); // Execute callback
            $("#confirmationModal").fadeOut(() => {
                $("#confirmationModal").remove(); // Remove delete modal only
            });
        });
    } else {
        // Auto-hide for simple alerts
        setTimeout(() => {
            $("#confirmationModal").fadeOut(() => {
                $("#confirmationModal").remove(); // Remove delete modal only
            });
        }, 1000); // Auto-close after 3 seconds
    }
}        



            return qlik.Promise.resolve();
        },
    };
});
