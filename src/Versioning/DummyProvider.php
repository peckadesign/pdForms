<?php declare(strict_types = 1);

namespace Pd\Forms\Versioning;

class DummyProvider implements \Pd\Forms\Versioning\Provider
{

	public function generatePathWithVersion(string $filePath): string
	{
		return $filePath;
	}}
