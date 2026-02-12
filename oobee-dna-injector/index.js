// index.js
export default function oobeeInjector() {
    return {
        name: 'oobee-injector',
        apply: 'serve',
        enforce: 'pre',
        transform(code, id) {
            if (!id.match(/\.(tsx|jsx|vue|html)$/) || id.includes('node_modules')) {
                return null;
            }

            const getPosition = (str, index) => {
                const lines = str.substring(0, index).split('\n');
                return {
                    line: lines.length,
                    column: lines[lines.length - 1].length + 1
                };
            };

            const transformedCode = code.replace(/<([A-Z][a-zA-Z0-9\.]*|[a-z][a-z0-9\-]*)/g, (match, tagName, offset) => {
                const blacklist = ['void', 'string', 'number', 'boolean', 'any', 'unknown', 'React'];
                if (blacklist.includes(tagName)) return match;

                const pos = getPosition(code, offset);
                return `<${tagName} data-oobee-path="${id}" data-oobee-line="${pos.line}" data-oobee-column="${pos.column}"`;
            });

            return { code: transformedCode, map: null };
        }
    };
}