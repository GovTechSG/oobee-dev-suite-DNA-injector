const HTML_ELEMENTS = new Set([
    'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base',
    'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption',
    'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del',
    'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset',
    'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5',
    'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img',
    'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map',
    'mark', 'menu', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol',
    'optgroup', 'option', 'output', 'p', 'picture', 'portal', 'pre',
    'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'search',
    'section', 'select', 'slot', 'small', 'source', 'span', 'strong', 'style',
    'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea',
    'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var',
    'video', 'wbr',
    'acronym', 'big', 'center', 'font', 'strike', 'tt', 'marquee', 'blink',
    'nobr', 'applet', 'basefont', 'dir', 'frame', 'frameset', 'isindex',
    'noframes', 'plaintext', 'xmp'
]);

const SVG_ELEMENTS = new Set([
    'svg', 'g', 'circle', 'ellipse', 'line', 'path', 'polygon', 'polyline',
    'rect', 'text', 'tspan', 'textPath', 'defs', 'linearGradient',
    'radialGradient', 'stop', 'use', 'symbol', 'mask', 'clipPath', 'pattern',
    'filter', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite',
    'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
    'feDistantLight', 'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB',
    'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge',
    'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight',
    'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence',
    'title', 'desc', 'foreignObject', 'marker', 'image', 'switch', 'view',
    'animate', 'animateMotion', 'animateTransform', 'mpath', 'set',
    'metadata', 'a'
]);

const MATHML_ELEMENTS = new Set([
    'math', 'annotation', 'annotation-xml', 'maction', 'menclose', 'merror',
    'mfenced', 'mfrac', 'mi', 'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded',
    'mphantom', 'mprescripts', 'mroot', 'mrow', 'ms', 'mspace', 'msqrt',
    'mstyle', 'msub', 'msubsup', 'msup', 'mtable', 'mtd', 'mtext', 'mtr',
    'munder', 'munderover', 'semantics'
]);

const VUE_BUILTIN_ELEMENTS = new Set([
    'component', 'transition', 'transition-group', 'keep-alive', 'teleport',
    'suspense', 'slot',
    'router-view', 'router-link',
    'nuxt-link', 'nuxt-page', 'nuxt-layout', 'nuxt-loading-indicator',
    'client-only', 'lazy-hydrate'
]);

const ANGULAR_BUILTIN_ELEMENTS = new Set([
    'ng-container', 'ng-content', 'ng-template',
    'router-outlet', 'router-link',
    'ng-select', 'ng-option', 'ng-optgroup',
    'ng-form', 'ng-model'
]);

function isKnownLowercaseTag(tagName, framework) {
    if (tagName.includes('-')) return true;
    if (HTML_ELEMENTS.has(tagName)) return true;
    if (SVG_ELEMENTS.has(tagName)) return true;
    if (MATHML_ELEMENTS.has(tagName)) return true;
    if (framework === 'vue' && VUE_BUILTIN_ELEMENTS.has(tagName)) return true;
    if (framework === 'angular' && ANGULAR_BUILTIN_ELEMENTS.has(tagName)) return true;
    return false;
}

export {
    HTML_ELEMENTS,
    SVG_ELEMENTS,
    MATHML_ELEMENTS,
    VUE_BUILTIN_ELEMENTS,
    ANGULAR_BUILTIN_ELEMENTS,
    isKnownLowercaseTag
};
