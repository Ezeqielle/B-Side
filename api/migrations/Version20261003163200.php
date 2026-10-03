<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261003163200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Titres à garder d\'une playlist, que le nettoyage laisse décochés (kept_track)';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE kept_track (kept_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, playlist_id INT NOT NULL, track_id VARCHAR(22) NOT NULL, PRIMARY KEY (playlist_id, track_id))');
        $this->addSql('CREATE INDEX IDX_8517832B6BBD148 ON kept_track (playlist_id)');
        $this->addSql('CREATE INDEX IDX_8517832B5ED23C43 ON kept_track (track_id)');
        $this->addSql('ALTER TABLE kept_track ADD CONSTRAINT FK_8517832B6BBD148 FOREIGN KEY (playlist_id) REFERENCES playlist (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE kept_track ADD CONSTRAINT FK_8517832B5ED23C43 FOREIGN KEY (track_id) REFERENCES track (id) NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE kept_track DROP CONSTRAINT FK_8517832B6BBD148');
        $this->addSql('ALTER TABLE kept_track DROP CONSTRAINT FK_8517832B5ED23C43');
        $this->addSql('DROP TABLE kept_track');
    }
}
