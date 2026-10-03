<?php

namespace App\Stats;

use App\Entity\User;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\Cache\TagAwareCacheInterface;

/**
 * Résultats des stats d'écoute et de playlists, par utilisateur et par paramètres.
 * Ils ne changent qu'après un import ou une synchro, qui vident ceux de l'utilisateur.
 */
final readonly class StatsCache
{
    private const int TTL = 86400;

    public function __construct(
        #[Target('stats.cache')]
        private TagAwareCacheInterface $cache,
    ) {
    }

    /**
     * @template T
     *
     * @param string        $name    nom du calcul, unique dans l'application (__METHOD__)
     * @param list<mixed>   $args    paramètres du calcul, en plus de l'utilisateur
     * @param \Closure(): T $compute
     *
     * @return T
     */
    public function get(User $user, string $name, array $args, \Closure $compute): mixed
    {
        $userId = $user->getId() ?? throw new \LogicException('User not persisted.');
        $key = $userId . '.' . hash('xxh128', serialize([$name, $args]));

        return $this->cache->get($key, static function (ItemInterface $item) use ($userId, $compute): mixed {
            $item->expiresAfter(self::TTL)->tag(self::tag($userId));

            return $compute();
        });
    }

    public function clear(int $userId): void
    {
        $this->cache->invalidateTags([self::tag($userId)]);
    }

    private static function tag(int $userId): string
    {
        return 'user.' . $userId;
    }
}
