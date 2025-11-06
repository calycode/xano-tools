/* eslint-disable no-undef */ // this file could be converted to esm, but we don't care here
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['util-resources/docs-template/index.html', 'docs/index.html'],
    theme: {
        extend: {
            colors: {
                'primary-dark': '#222326',
                primary: '#3C3D40',
                secondary: '#666A73',
                muted: '#9FA3A6',
                light: '#D7D7D9',
            },
            fontFamily: {
                sans: ['Noto Sans', 'ui-sans-serif', 'system-ui'],
            },
        },
    },
    plugins: [],
};
