// Create this new file for shared configuration
const CLOUDINARY_CONFIG = {
    cloudName: "dcsd2trwx", // Your cloud name
    version: "v1733897743",
    folder: "player_images",
    defaultTransformation: "f_auto,q_auto", // Add default transformations for optimization
};

// Shared image utility functions
function getPlayerImageUrl(player) {
    console.log("Player object received:", player);
    if (!player) {
        return getPlaceholderImageUrl();
    }

    // Handle DST differently
    if (
        player.Position === "DST" ||
        player.name?.includes("DST") ||
        player.position == "DST"
    ) {
        // Clean up team name and remove any trailing spaces
        const teamName = (player.name || player.first_name || "")
            .replace(/\s*DST\s*/i, "") // More robust DST removal
            .trim()
            .toLowerCase();

        const dstUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${CLOUDINARY_CONFIG.defaultTransformation}/${CLOUDINARY_CONFIG.version}/${CLOUDINARY_CONFIG.folder}/${teamName}.png.png`;

        // Add detailed logging
        console.log("DST Image Processing:", {
            input: {
                name: player.name,
                firstName: player.first_name,
                position: player.position,
            },
            processing: {
                cleanedTeamName: teamName,
                finalUrl: dstUrl,
            },
        });

        // Pre-load the image to verify it exists
        const img = new Image();
        img.onload = () =>
            console.log(`DST image loaded successfully: ${teamName}`);
        img.onerror = (e) =>
            console.error(`DST image failed to load: ${teamName}`, e);
        img.src = dstUrl;

        return dstUrl;
    }

    // For regular players, check if we have first_name/last_name or just name
    let firstName, lastName;
    if (player.first_name && player.last_name) {
        firstName = player.first_name;
        lastName = player.last_name;
    } else if (player.name) {
        const nameParts = player.name.split(" ");
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(" ");
    } else {
        return getPlaceholderImageUrl();
    }

    // Clean up the names
    firstName = firstName.toLowerCase().replace(/[.']/g, "");
    lastName = lastName
        .toLowerCase()
        // Remove suffixes like Sr., Jr., III, etc.
        .replace(/\s+(sr\.?|jr\.?|[ivx]+)$/i, "")
        // Remove periods and apostrophes
        .replace(/[.']/g, "");

    const imageName = `${firstName}_${lastName}`;
    const imageUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${CLOUDINARY_CONFIG.defaultTransformation}/${CLOUDINARY_CONFIG.version}/${CLOUDINARY_CONFIG.folder}/${imageName}.png.png`;
    console.log("Using player image URL:", imageUrl);
    return imageUrl;
}

function getPlaceholderImageUrl() {
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${CLOUDINARY_CONFIG.defaultTransformation}/${CLOUDINARY_CONFIG.version}/${CLOUDINARY_CONFIG.folder}/player_placeholder.png.png`;
}

// Preload placeholder image
function preloadPlaceholderImage() {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = getPlaceholderImageUrl();
}

preloadPlaceholderImage();
