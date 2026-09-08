export const metadata = {
  title: "JobPilot — AI Job Matcher",
  description:
    "Score your candidate profile against a job description using a self-hosted Qwen model.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
