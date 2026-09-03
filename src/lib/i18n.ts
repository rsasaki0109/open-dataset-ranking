import { useEffect, useState } from 'react';

export type Language = 'ja' | 'en';

export interface Copy {
  siteTitle: string;
  siteSubtitle: string;
  dailyUpdate: string;
  light: string;
  dark: string;
  loading: string;
  loadError: string;
  datasets: string;
  updated: string;
  trending: string;
  trendingSubtitle: string;
  popular: string;
  popularSubtitle: string;
  recentlyUpdated: string;
  recentlyUpdatedSubtitle: string;
  kaggle: string;
  huggingFace: string;
  topKaggle: string;
  topHuggingFace: string;
  explore: string;
  exploreSubtitle: string;
  keywordSearch: string;
  searchPlaceholder: string;
  source: string;
  allSources: string;
  tagCategory: string;
  allTags: string;
  sort: string;
  mostPopular: string;
  recently: string;
  mostEngaged: string;
  cards: string;
  table: string;
  results: string;
  page: string;
  prev: string;
  next: string;
  noDescription: string;
  downloads: string;
  likesVotes: string;
  license: string;
  score: string;
  metadataNotice: string;
  github: string;
  languageSwitch: string;
}

export const COPY: Record<Language, Copy> = {
  ja: {
    siteTitle: 'Open Dataset Ranking', siteSubtitle: 'Kaggle × Hugging Face', dailyUpdate: 'メタデータのみ · 毎日更新',
    light: 'ライト', dark: 'ダーク', loading: 'データセットを読み込んでいます…', loadError: 'データセットデータの読み込みに失敗しました',
    datasets: 'データセット', updated: '更新', trending: 'トレンド', trendingSubtitle: '人気度・新しさ・反応を組み合わせた総合スコア',
    popular: '人気ランキング', popularSubtitle: 'ダウンロード数をもとにした人気スコア', recentlyUpdated: '最近更新されたデータ', recentlyUpdatedSubtitle: '更新日の新しさをもとにしたランキング',
    kaggle: 'Kaggle', huggingFace: 'Hugging Face', topKaggle: 'Kaggleの注目データセット', topHuggingFace: 'Hugging Faceの注目データセット',
    explore: 'すべてのデータセットを探す', exploreSubtitle: 'キーワード・ソース・タグで絞り込み、並び替え、ページ移動できます', keywordSearch: 'キーワード検索', searchPlaceholder: '例: image、nlp、売上予測…',
    source: 'ソース', allSources: 'すべてのソース', tagCategory: 'タグ / カテゴリ', allTags: 'すべてのタグ', sort: '並び順', mostPopular: '人気順', recently: '更新が新しい順', mostEngaged: '反応の多い順',
    cards: 'カード', table: 'テーブル', results: '件', page: 'ページ', prev: '前へ', next: '次へ', noDescription: '説明なし', downloads: 'ダウンロード', likesVotes: 'Likes / Votes', license: 'ライセンス', score: 'スコア',
    metadataNotice: 'メタデータのみ掲載。データセット本体は各提供元から取得してください。', github: 'GitHub: open-dataset-ranking', languageSwitch: 'English',
  },
  en: {
    siteTitle: 'Open Dataset Ranking', siteSubtitle: 'Kaggle × Hugging Face', dailyUpdate: 'metadata only · daily update',
    light: 'Light', dark: 'Dark', loading: 'Loading datasets…', loadError: 'Failed to load dataset data', datasets: 'datasets', updated: 'updated', trending: 'Trending', trendingSubtitle: 'Top total score (popularity + freshness + engagement)',
    popular: 'Most Popular', popularSubtitle: 'Top by download-based popularity score', recentlyUpdated: 'Recently Updated', recentlyUpdatedSubtitle: 'Top by freshness score', kaggle: 'Kaggle', huggingFace: 'Hugging Face', topKaggle: 'Top Kaggle datasets', topHuggingFace: 'Top Hugging Face datasets',
    explore: 'Explore all datasets', exploreSubtitle: 'Search, filter by source/tag, sort, and paginate', keywordSearch: 'Keyword search', searchPlaceholder: 'e.g. image, nlp, sales…', source: 'Source', allSources: 'All sources', tagCategory: 'Tag / category', allTags: 'All tags', sort: 'Sort', mostPopular: 'Most popular', recently: 'Recently updated', mostEngaged: 'Most engaged',
    cards: 'Cards', table: 'Table', results: 'results', page: 'page', prev: 'Prev', next: 'Next', noDescription: 'No description.', downloads: 'Downloads', likesVotes: 'Likes / Votes', license: 'License', score: 'Score', metadataNotice: 'Metadata only. Get the dataset itself from its original provider.', github: 'GitHub: open-dataset-ranking', languageSwitch: '日本語',
  },
};

export function useLanguage(): [Language, () => void] {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'ja';
    return window.localStorage.getItem('odr-language') === 'en' ? 'en' : 'ja';
  });
  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem('odr-language', language);
  }, [language]);
  return [language, () => setLanguage((current) => (current === 'ja' ? 'en' : 'ja'))];
}
