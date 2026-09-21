// Writes a running "age" (in decimal years) into an element, optionally
// re-computing it on an interval so the trailing digits tick upward.
export default class TimeSince {
    /**
     * @param {HTMLElement} container - Element where the age will be displayed
     * @param {Object} options
     * @param {string|Date} options.birthdate - Date of birth, e.g. "2000-01-31"
     * @param {number} [options.interval=10] - Update interval in ms (animated only)
     * @param {boolean} [options.animated=true] - Whether the age should update continuously
     * @param {boolean} [options.floor=false] - Display a whole number instead of decimals
     */
    constructor(container, { birthdate, interval = 10, animated = true, floor = false } = {}) {
        this.container = container;
        this.birthdate = new Date(birthdate);
        this.interval = interval;
        this.animated = animated;
        this.floor = floor;
        this.timer = null;

        if (!this.container || !birthdate) return;

        this.update();
        if (this.animated) this.start();
    }

    start() {
        this.stop(); // prevent overlapping intervals
        this.timer = setInterval(() => this.update(), this.interval);
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
    }

    update() {
        const diffDays = (Date.now() - this.birthdate) / (1000 * 3600 * 24);
        const decimalAge = diffDays / 365.25;

        this.container.innerText = this.floor
            ? Math.floor(decimalAge)
            : decimalAge.toFixed(9);
    }
}
