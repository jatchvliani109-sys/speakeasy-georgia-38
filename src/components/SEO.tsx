import { Helmet } from "react-helmet-async";

type Props = {
  title: string;
  description?: string;
  path: string;
};

/**
 * Per-route head: sets <title>, <meta description>, canonical and og tags.
 * Sitewide og:* fallbacks live in index.html for non-JS social crawlers.
 */
export default function SEO({ title, description, path }: Props) {
  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={path} />
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={path} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="ka_GE" />
    </Helmet>
  );
}
