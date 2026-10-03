<?php

namespace App\Deezer;

/**
 * Erreur renvoyée par l'API Deezer (quota, indisponibilité…), autre que « titre introuvable ».
 */
class DeezerException extends \RuntimeException
{
}
