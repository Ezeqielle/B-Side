<?php

namespace App\Deezer;

final readonly class DeezerTrack
{
    /**
     * @param ?string $previewUrl MP3 de 30 s, valable environ 15 min
     */
    public function __construct(
        public int $id,
        public ?string $previewUrl,
    ) {
    }

    /**
     * @param array<string, mixed> $data objet "track" de l'API Deezer
     */
    public static function fromApi(array $data): self
    {
        return new self(
            id: $data['id'],
            previewUrl: ($data['preview'] ?? '') ?: null,
        );
    }
}
