/**
 * Copies a mailto: address on click, as a fallback for visitors with no mail
 * client. The link keeps its normal behaviour, and says so for a moment.
 *
 * @param {HTMLAnchorElement} link — The mailto: link to watch.
 * @param {string} message — Text shown while the address is in the clipboard.
 * @param {number} duration — How long that text stays, in ms.
 */
export default function copyEmail(
    link,
    { message = "Address copied", duration = 3000 } = {},
) {
    // writeText needs a secure context: https, or localhost while developing.
    if (!link || !navigator.clipboard) return;

    const original = link.textContent;
    const emailAddress = link.href.replace(/^mailto:/, "");
    let timer;

    link.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(emailAddress);
        } catch {
            return;
        }

        clearTimeout(timer);
        link.textContent = message;
        timer = setTimeout(() => (link.textContent = original), duration);
    });
}
