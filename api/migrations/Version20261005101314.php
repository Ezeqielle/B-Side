<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261005101314 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Comptes Spotify liés, entre lesquels on peut copier des playlists (linked_account)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE linked_account (user_id INT NOT NULL, linked_user_id INT NOT NULL, PRIMARY KEY (user_id, linked_user_id))');
        $this->addSql('CREATE INDEX IDX_167E6E33A76ED395 ON linked_account (user_id)');
        $this->addSql('CREATE INDEX IDX_167E6E33CC26EB02 ON linked_account (linked_user_id)');
        $this->addSql('ALTER TABLE linked_account ADD CONSTRAINT FK_167E6E33A76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE linked_account ADD CONSTRAINT FK_167E6E33CC26EB02 FOREIGN KEY (linked_user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE linked_account DROP CONSTRAINT FK_167E6E33A76ED395');
        $this->addSql('ALTER TABLE linked_account DROP CONSTRAINT FK_167E6E33CC26EB02');
        $this->addSql('DROP TABLE linked_account');
    }
}
