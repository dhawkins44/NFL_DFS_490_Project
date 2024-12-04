function formatNameForImage(name) {
    // Define suffixes to remove (case-insensitive)
    const SUFFIXES = ["jr", "sr", "ii", "iii", "iv", "v"];

    // First, trim any extra whitespace
    name = name.trim();

    if (name.includes("DST")) {
        // For DST, just return the team name in lowercase
        return name.split(" DST")[0].toLowerCase();
    } else if (!name.includes(" ")) {
        // For single-word team names, return in lowercase
        return name.toLowerCase();
    } else {
        // For players, handle special cases
        let cleanedName = name.toLowerCase();

        // Special handling for names with periods and apostrophes
        cleanedName = cleanedName
            .replace(/\./g, "") // Remove periods
            .replace(/'/g, "") // Remove apostrophes
            .trim();

        // Split the name into parts
        const nameParts = cleanedName.split(" ");

        // Check if the last part is a suffix and remove it if present
        const lastPart = nameParts[nameParts.length - 1];
        if (SUFFIXES.includes(lastPart)) {
            nameParts.pop();
        }

        // After removing the suffix, ensure there are still enough parts
        if (nameParts.length === 0) {
            // If all parts were suffixes, return an empty string or handle accordingly
            return "";
        } else if (nameParts.length === 1) {
            // If there's only one part left, return it in lowercase
            return nameParts[0];
        } else {
            // Handle hyphenated last names
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join("_").replace(/-/g, "-"); // Preserve hyphens
            return `${firstName}_${lastName}`;
        }
    }
}
