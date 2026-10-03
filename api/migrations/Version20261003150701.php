<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261003150701 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Pochette des titres (track.image_url), remplie en relisant toutes les playlists';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE track ADD image_url TEXT DEFAULT NULL');
        // Sans snapshot_id, la prochaine synchro relit chaque playlist et enregistre les pochettes de ses titres
        $this->addSql('UPDATE playlist SET snapshot_id = NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE track DROP image_url');
    }
}
