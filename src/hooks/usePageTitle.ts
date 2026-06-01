import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
}

/**
 * Hook to manage per-page SEO meta tags (title, description, canonical, robots).
 * Uses react-helmet-async for SSR-compatible head management.
 */
export const useSEO = ({ title, description, canonical, noindex = false }: SEOProps) => {
  const fullTitle = `${title} | اختبارات`;
  const siteUrl = "https://examshubs.netlify.app";
  const canonicalUrl = canonical ? `${siteUrl}${canonical}` : undefined;

  return { Helmet, fullTitle, description, canonicalUrl, noindex };
};

/**
 * Sets the page title via document.title.
 * Works alongside react-helmet-async — pages using <Helmet> override this automatically.
 */
export const usePageTitle = (title: string) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${title} | اختبارات`;

    return () => {
      document.title = prevTitle;
    };
  }, [title]);
};
