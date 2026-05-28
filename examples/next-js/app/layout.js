export const metadata = {
    title: 'Next.js + DNA Injector',
    description: 'Sample Next.js app with oobee-genome'
};

export default function RootLayout({
    children,
}) {
    return (
        <html lang="en">
            <body>
                {children}
            </body>
        </html>
    );
}
