export default class Gallery {
    /**
     * @param {number} defaultProject — Zero-based index of the project shown on load, -1 for none.
     * @param {ParentNode} root — Where to look for the links and the panels.
     */
    constructor({ defaultProject = -1, root = document } = {}) {
        // Each link points at its panel ("#project-<path>"), so the pairs
        // are read from the markup instead of relying on matching order.
        this.projects = [...root.querySelectorAll(".projects__link")]
            .map((link) => ({
                link,
                panel: root.querySelector(`[id="${link.hash.slice(1)}"]`),
            }))
            .filter(({ panel }) => panel);

        if (!this.projects.length) return;

        // Every panel, so one without a link in the list still gets hidden.
        this.panels = root.querySelectorAll(".project");

        this.projects.forEach(({ link, panel }, index) => {
            link.setAttribute("aria-controls", panel.id);

            link.addEventListener("click", (event) => {
                event.preventDefault();
                this.show(index);
                this.scrollToProject(panel);
            });
        });

        // An out of range index shows nothing, so no guard is needed.
        this.show(defaultProject);
    }

    // Reveal one project and hide every other one.
    show(index) {
        const active = this.projects[index]?.panel;

        this.panels.forEach((panel) => {
            panel.hidden = panel !== active;
        });

        this.projects.forEach(({ link }, i) => {
            const visible = i === index;
            link.classList.toggle("projects__link--active", visible);
            link.setAttribute("aria-expanded", String(visible));
        });
    }

    // Called on click only, so the default project does not move the page
    // on load. The gliding comes from scroll-behavior in the CSS.
    scrollToProject(panel) {
        const scroll = () => panel.scrollIntoView({ block: "start" });

        scroll();

        // A lazy image lands after the scroll and makes the page taller,
        // so follow it down as long as the project is still open.
        panel.querySelectorAll("img").forEach((image) => {
            if (image.complete && image.naturalWidth > 0) return;

            image.addEventListener(
                "load",
                () => {
                    if (!panel.hidden) scroll();
                },
                { once: true },
            );
        });
    }
}
