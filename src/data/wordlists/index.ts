import en from "../wordlists.json";
import de from "./de.json";
import es from "./es.json";
import fr from "./fr.json";
import it from "./it.json";
import ja from "./ja.json";
import ko from "./ko.json";
import pt from "./pt.json";
import zh from "./zh.json";

type Wordlists = typeof en;

const wordlistsByLocale: Record<string, Wordlists> = {
  en,
  de,
  es,
  fr,
  it,
  ja,
  ko,
  pt,
  zh,
};

export function getWordlists(locale: string): Wordlists {
  return wordlistsByLocale[locale] ?? en;
}
