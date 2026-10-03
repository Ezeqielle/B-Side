<?php

namespace App\Spotify\Model;

final readonly class Artist
{
    public function __construct(
        public string $id,
        public string $name,
        public ?string $imageUrl,
    ) {
    }

    /**
     * @param array<string, mixed> $data objet "artist" de l'API Spotify
     */
    public static function fromApi(array $data): self
    {
        return new self(
            id: $data['id'],
            name: $data['name'],
            imageUrl: $data['images'][0]['url'] ?? null,
        );
    }
}
