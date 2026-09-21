import "@fontsource/inter/400.css";
import "@fontsource/inter/400-italic.css";
import "@fontsource/spectral/400.css";
import "@fontsource/spectral/400-italic.css";
import "../scss/main.scss";
import LazyLoad from "vanilla-lazyload";
import Gallery from "./project-gallery";
import TimeSince from "./time-since";
import copyEmail from "./copy-email";

// An image inside a hidden panel never meets the viewport, so it loads
// only once its project is revealed. The class it gets on arrival fades
// it in, see _components.scss.
new LazyLoad({
    elements_selector: ".project__image",
    class_loaded: "project__image--loaded",
});

// Opens one project panel at a time; -1 means none is open on load.
new Gallery({ defaultProject: -1 });

// Writes an age in decimal years into <span id="age">, if the page has one.
const ageContainer = document.querySelector("#age");
new TimeSince(ageContainer, {
    birthdate: ageContainer.dataset.age,
    animated: true,
});

// Fallback for visitors with no mail client.
copyEmail(document.querySelector(".contact__link"));
