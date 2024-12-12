// Create this new file for shared configuration
const CLOUDINARY_CONFIG = {
    cloudName: "dcsd2trwx", // Your cloud name
    version: "v1733897743",
    folder: "player_images",
    defaultTransformation: "f_auto,q_auto", // Add default transformations for optimization
};

// Shared image utility functions
function getPlayerImageUrl(player) {
    if (
        !player ||
        !player.position ||
        (typeof player.position === "string" &&
            player.position.toLowerCase().includes("<!doctype"))
    ) {
        return {
            url: getPlaceholderImageUrl(),
            isPlaceholder: true,
        };
    }

    // Handle DST differently
    if (
        player.Position === "DST" ||
        player.name?.includes("DST") ||
        player.position === "DST"
    ) {
        const teamName = (player.name || player.first_name || "")
            .replace(/\s*DST\s*/i, "")
            .trim()
            .toLowerCase();

        const url = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${CLOUDINARY_CONFIG.defaultTransformation}/${CLOUDINARY_CONFIG.version}/${CLOUDINARY_CONFIG.folder}/${teamName}.png.png`;
        return {
            url,
            isPlaceholder: false,
        };
    }

    // Regular player handling
    let firstName, lastName;
    if (player.first_name && player.last_name) {
        firstName = player.first_name;
        lastName = player.last_name;
    } else if (player.name) {
        const nameParts = player.name.split(" ");
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(" ");
    } else {
        return {
            url: getPlaceholderImageUrl(),
            isPlaceholder: true,
        };
    }

    firstName = firstName.toLowerCase().replace(/[.']/g, "");
    lastName = lastName
        .toLowerCase()
        .replace(/\s+(sr\.?|jr\.?|[ivx]+)$/i, "")
        .replace(/[.']/g, "")
        .replace(/\s+/g, "_");

    const imageName = `${firstName}_${lastName}`;
    const url = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${CLOUDINARY_CONFIG.defaultTransformation}/${CLOUDINARY_CONFIG.version}/${CLOUDINARY_CONFIG.folder}/${imageName}.png.png`;
    return {
        url,
        isPlaceholder: false,
    };
}

function getPlaceholderImageUrl() {
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${CLOUDINARY_CONFIG.defaultTransformation}/${CLOUDINARY_CONFIG.version}/${CLOUDINARY_CONFIG.folder}/player_placeholder.png.png`;
}

// Helper function to create/update player images
function createPlayerImage(player, existingImg = null) {
    // Add defensive check at the start
    if (!player || typeof player !== "object") {
        console.error("Invalid player object received:", player);
        return createPlaceholderImage(existingImg);
    }

    const imageData = getPlayerImageUrl(player);
    const img = existingImg || document.createElement("img");
    img.classList.add("player-image");
    img.src = imageData.url;

    img.onerror = () => {
        img.src = getPlaceholderImageUrl();
    };

    return img;
}

// Helper function to create placeholder image
function createPlaceholderImage(existingImg = null) {
    const img = existingImg || document.createElement("img");
    img.classList.add("player-image");
    img.src = getPlaceholderImageUrl();
    return img;
}

// Export the functions if using modules
window.CLOUDINARY_CONFIG = CLOUDINARY_CONFIG;
window.getPlayerImageUrl = getPlayerImageUrl;
window.getPlaceholderImageUrl = getPlaceholderImageUrl;
window.createPlayerImage = createPlayerImage;
