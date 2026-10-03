<?php

namespace App\Tests\Controller;

use App\Entity\Track;
use App\Entity\User;
use App\Message\ImportPlays;
use App\MessageHandler\ImportPlaysHandler;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Messenger\Envelope;
use Symfony\Component\Messenger\Transport\InMemory\InMemoryTransport;

class HistoryControllerTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();

        $em = static::getContainer()->get(EntityManagerInterface::class);
        // Écoutes et playlists sont supprimées avec l'utilisateur (ON DELETE CASCADE)
        foreach ([User::class, Track::class] as $entity) {
            $em->createQuery('DELETE FROM ' . $entity)->execute();
        }

        $user = new User('spotify-user-1')->setDisplayName('Jane Doe');
        $em->persist($user);
        $em->flush();

        $this->client->loginUser($user);
    }

    public function testImportStoresEachPlayOnce(): void
    {
        $this->upload(__DIR__ . '/../fixtures/Streaming_History_Audio_2020-2021.json');

        self::assertResponseStatusCodeSame(202);
        self::assertJsonStringEqualsJsonString('{"plays":4}', (string) $this->client->getResponse()->getContent());

        $handler = static::getContainer()->get(ImportPlaysHandler::class);
        foreach ($this->queuedMessages() as $message) {
            self::assertInstanceOf(ImportPlays::class, $message);
            // Deux fois, comme un fichier envoyé en double : pas de doublons
            $handler($message);
            $handler($message);
        }

        $this->client->request('GET', '/api/history');

        self::assertResponseIsSuccessful();
        $summary = json_decode((string) $this->client->getResponse()->getContent(), true);
        self::assertSame(3, $summary['plays']);
        self::assertSame(2, $summary['tracks']);
        self::assertEquals(new \DateTimeImmutable('2020-03-01T10:00:00Z'), new \DateTimeImmutable($summary['firstPlayedAt']));
        self::assertEquals(new \DateTimeImmutable('2021-12-31T23:59:59Z'), new \DateTimeImmutable($summary['lastPlayedAt']));
    }

    public function testSummaryIsEmptyBeforeImport(): void
    {
        $this->client->request('GET', '/api/history');

        self::assertResponseIsSuccessful();
        self::assertJsonStringEqualsJsonString(
            '{"plays":0,"tracks":0,"firstPlayedAt":null,"lastPlayedAt":null}',
            (string) $this->client->getResponse()->getContent(),
        );
    }

    public function testImportRejectsOtherFiles(): void
    {
        // Historique simple, livré avec les données du compte
        $this->upload(__DIR__ . '/../fixtures/StreamingHistory_music_0.json');

        self::assertResponseStatusCodeSame(422);
        self::assertEmpty($this->queuedMessages());
    }

    /**
     * @return array<object>
     */
    private function queuedMessages(): array
    {
        /** @var InMemoryTransport $transport */
        $transport = static::getContainer()->get('messenger.transport.async');

        return array_map(static fn (Envelope $envelope): object => $envelope->getMessage(), $transport->getSent());
    }

    private function upload(string $path): void
    {
        $this->client->request('POST', '/api/history', files: [
            'file' => new UploadedFile($path, basename($path), 'application/json', test: true),
        ]);
    }
}
