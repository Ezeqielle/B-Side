<?php

namespace App\Playlist;

/**
 * Versions d'un même morceau dans une playlist : single, album, compilation, edit ou instrumental.
 *
 * Deux titres sont des versions d'un même morceau quand leur titre de base (sans ce qui suit « - »
 * ni ce qui est entre parenthèses, sauf un remix) est le même, avec le même artiste ou, pour les
 * collaborations et compilations rangées sous un autre artiste, la même durée. Un remix est donc
 * un autre morceau que l'original et que les autres remix.
 *
 * Ce sont le même enregistrement quand, en plus, leur titre ne diffère que par des mentions sans effet
 * (feat., Radio Edit, Remastered…) et leur durée de quelques secondes au plus.
 */
final class SongVersions
{
    /** Écart de durée d'un même enregistrement selon la sortie. */
    private const int SAME_DURATION_MS = 2000;

    /** Mentions qui ne changent pas l'enregistrement, entre parenthèses ou après « - ». */
    private const string NEUTRAL = '/^(?:(?:feat\.?|ft\.?|featuring|with)\s.*|original mix|radio edit|radio version|album version|single version|mono|stereo|explicit|clean|(?:\d{4}\s)?remaster(?:ed)?(?:\s\d{4})?(?:\sversion)?)$/u';

    /** Mentions d'un remix, un autre morceau que l'original. */
    private const string REMIX = '/\b(?:remix|rmx|rework|bootleg|re-?edit|vip)\b|(?<!original|extended|radio|club|album|single|main|instrumental)\smix\b/u';

    /**
     * @param list<PlaylistTrackStat> $tracks titres de la playlist, dans l'ordre
     *
     * @return list<list<SongVersion>> groupes d'au moins deux titres, dans l'ordre de la playlist
     */
    public static function group(array $tracks): array
    {
        // Partitions (union-find) : chaque titre pointe vers un titre plus haut du même groupe
        $songs = $recordings = array_keys($tracks);

        $byBase = [];
        foreach ($tracks as $i => $track) {
            $byBase[self::base($track->name)][] = $i;
        }

        foreach ($byBase as $indexes) {
            foreach ($indexes as $n => $i) {
                foreach (\array_slice($indexes, $n + 1) as $j) {
                    [$a, $b] = [$tracks[$i], $tracks[$j]];
                    $sameDuration = null !== $a->durationMs && null !== $b->durationMs
                        && abs($a->durationMs - $b->durationMs) <= self::SAME_DURATION_MS;

                    if ($sameDuration || self::fold($a->artistName) === self::fold($b->artistName)) {
                        self::join($songs, $i, $j);
                    }
                    if ($sameDuration && self::title($a->name) === self::title($b->name)) {
                        self::join($recordings, $i, $j);
                    }
                }
            }
        }

        $groups = [];
        foreach ($tracks as $i => $track) {
            $groups[self::find($songs, $i)][] = new SongVersion($track, $tracks[self::find($recordings, $i)]->position);
        }

        return array_values(array_filter($groups, static fn (array $group): bool => \count($group) > 1));
    }

    /**
     * Titre sans ce qui suit « - » ni ce qui est entre parenthèses ou crochets, sauf un remix.
     */
    public static function base(string $name): string
    {
        $name = preg_replace_callback(
            ['/\s*[(\[]([^)\]]*)[)\]]/u', '/\s+-\s+(.*)$/u'],
            static fn (array $match): string => preg_match(self::REMIX, $match[1]) ? ' (' . trim($match[1]) . ')' : '',
            self::fold($name),
        ) ?? '';

        return self::spaces($name);
    }

    /**
     * Titre sans les mentions qui ne changent pas l'enregistrement.
     */
    public static function title(string $name): string
    {
        $name = preg_replace_callback(
            ['/\s*[(\[]([^)\]]*)[)\]]/u', '/\s+-\s+(.*)$/u'],
            static fn (array $match): string => preg_match(self::NEUTRAL, trim($match[1])) ? '' : ' (' . trim($match[1]) . ')',
            self::fold($name),
        ) ?? '';

        return self::spaces($name);
    }

    /**
     * Réunit les groupes de `$i` et `$j`, rattachés au titre le plus haut dans la playlist.
     *
     * @param array<int, int> $parents
     */
    private static function join(array &$parents, int $i, int $j): void
    {
        [$a, $b] = [self::find($parents, $i), self::find($parents, $j)];
        $parents[max($a, $b)] = min($a, $b);
    }

    /**
     * @param array<int, int> $parents
     */
    private static function find(array $parents, int $i): int
    {
        while ($parents[$i] !== $i) {
            $i = $parents[$i];
        }

        return $i;
    }

    /**
     * Minuscules, sans accents, apostrophes droites.
     */
    private static function fold(string $text): string
    {
        $text = \Normalizer::normalize($text, \Normalizer::FORM_D) ?: $text;

        return mb_strtolower(str_replace(['’', '‘'], "'", preg_replace('/\p{Mn}/u', '', $text) ?? $text));
    }

    private static function spaces(string $text): string
    {
        return trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    }
}
