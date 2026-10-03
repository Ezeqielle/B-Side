<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261003154244 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Type et nombre de titres de la sortie (track.album_type, album_tracks), remplis en relisant toutes les playlists';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE track ADD album_type VARCHAR(20) DEFAULT NULL');
        $this->addSql('ALTER TABLE track ADD album_tracks INT DEFAULT NULL');
        // Sans snapshot_id, la prochaine synchro relit chaque playlist et enregistre la sortie de ses titres
        $this->addSql('UPDATE playlist SET snapshot_id = NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE track DROP album_type');
        $this->addSql('ALTER TABLE track DROP album_tracks');
    }
}
