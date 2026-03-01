import en from "../wordlists.json";
import de from "./de.json";
import es from "./es.json";
import fr from "./fr.json";
import it from "./it.json";
import ja from "./ja.json";
import ko from "./ko.json";
import pt from "./pt.json";
import zh from "./zh.json";

export type Wordlists = typeof en & { FillingGender?: ("m" | "f")[] };

const wordlistsByLocale: Record<string, Wordlists> = {
  en,
  de,
  es,
  fr: fr as unknown as Wordlists,
  it: it as unknown as Wordlists,
  ja,
  ko,
  pt,
  zh,
};

export function getWordlists(locale: string): Wordlists {
  return wordlistsByLocale[locale] ?? en;
}
