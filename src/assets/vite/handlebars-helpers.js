// HANDLEBARS HELPERS
// ------------------------------------------------------------
// Functions callable from any template, e.g. {{formatDate date}}.

// "2024-01-27" → "Jan 27, 2024". Read as UTC so the day never shifts
// with the build machine's timezone.
function formatDate(isoDate) {
    return new Date(isoDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

export default { formatDate };
