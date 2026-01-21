-- CreateTable
CREATE TABLE `Tecnico` (
    `id_tecnico` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `cognome` VARCHAR(191) NOT NULL,
    `id_usuario` INTEGER NULL,

    UNIQUE INDEX `Tecnico_id_usuario_key`(`id_usuario`),
    PRIMARY KEY (`id_tecnico`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lotto` (
    `id_lotto` INTEGER NOT NULL AUTO_INCREMENT,
    `numero_lotto` VARCHAR(191) NOT NULL,
    `anno` INTEGER NOT NULL,
    `descrizione` VARCHAR(191) NULL,
    `data_creazione` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `numero_telaio_da` VARCHAR(191) NULL,
    `numero_telaio_a` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Lotto_numero_lotto_key`(`numero_lotto`),
    PRIMARY KEY (`id_lotto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Maquina` (
    `id_maquina` INTEGER NOT NULL AUTO_INCREMENT,
    `numero_telaio` VARCHAR(191) NOT NULL,
    `seriale_compressore` VARCHAR(191) NULL,
    `tipo_gas` VARCHAR(191) NULL,
    `quantita_gas` DOUBLE NULL,
    `tipo_valvola` VARCHAR(191) NULL,
    `regolazione_valvola` VARCHAR(191) NULL,
    `annotazioni` VARCHAR(191) NULL,
    `stato` VARCHAR(191) NULL,
    `foto1` VARCHAR(191) NULL,
    `foto2` VARCHAR(191) NULL,
    `data_consegna` DATETIME(3) NULL,
    `fecha_primera_prueba` DATETIME(3) NULL,
    `fecha_estado_ok` DATETIME(3) NULL,
    `id_tecnico` INTEGER NULL,
    `id_lotto` INTEGER NULL,

    UNIQUE INDEX `Maquina_numero_telaio_key`(`numero_telaio`),
    PRIMARY KEY (`id_maquina`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Test` (
    `id_test` INTEGER NOT NULL AUTO_INCREMENT,
    `id_maquina` INTEGER NOT NULL,
    `id_tecnico` INTEGER NULL,
    `temperatura_iniziale` DOUBLE NULL,
    `regolazione_vite` VARCHAR(191) NULL,
    `tempo_0_gradi` INTEGER NULL,
    `tempo_meno8_gradi` INTEGER NULL,
    `quantita_liquido` DOUBLE NULL,
    `humedad_ambiente` DOUBLE NULL,
    `fecha_test` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `hora_test` DATETIME(3) NULL,
    `observazioni` VARCHAR(191) NULL,

    PRIMARY KEY (`id_test`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `google_id` VARCHAR(191) NULL,
    `google_email` VARCHAR(191) NULL,
    `google_refresh_token` VARCHAR(191) NULL,
    `foto` VARCHAR(191) NULL,
    `rol` VARCHAR(191) NOT NULL DEFAULT 'tecnico',
    `estado` VARCHAR(191) NOT NULL DEFAULT 'pendiente',
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_aprobacion` DATETIME(3) NULL,
    `aprobado_por` INTEGER NULL,

    UNIQUE INDEX `Usuario_email_key`(`email`),
    UNIQUE INDEX `Usuario_google_id_key`(`google_id`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Materiale` (
    `id_materiale` INTEGER NOT NULL AUTO_INCREMENT,
    `cod_articolo` VARCHAR(191) NOT NULL,
    `codice` VARCHAR(191) NULL,
    `descrizione` VARCHAR(191) NOT NULL,
    `fornitore` VARCHAR(191) NOT NULL,
    `unita_misura` VARCHAR(191) NULL,
    `prezzo_unitario` DOUBLE NULL,
    `note` VARCHAR(191) NULL,
    `stock_comprado` DOUBLE NOT NULL DEFAULT 0,
    `stock_utilizado` DOUBLE NOT NULL DEFAULT 0,
    `stock_disponible` DOUBLE NOT NULL DEFAULT 0,
    `activar_alerta` BOOLEAN NOT NULL DEFAULT true,
    `stock_minimo` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Materiale_cod_articolo_fornitore_key`(`cod_articolo`, `fornitore`),
    PRIMARY KEY (`id_materiale`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ordine` (
    `id_ordine` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NULL,
    `stato` VARCHAR(191) NOT NULL DEFAULT 'richiesto',
    `data_richiesta` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `data_ordine` DATETIME(3) NULL,
    `data_consegna_prevista` DATETIME(3) NULL,
    `data_consegna` DATETIME(3) NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id_ordine`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrdineItem` (
    `id_item` INTEGER NOT NULL AUTO_INCREMENT,
    `id_ordine` INTEGER NOT NULL,
    `id_materiale` INTEGER NOT NULL,
    `quantita` DOUBLE NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id_item`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Tecnico` ADD CONSTRAINT `Tecnico_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Maquina` ADD CONSTRAINT `Maquina_id_tecnico_fkey` FOREIGN KEY (`id_tecnico`) REFERENCES `Tecnico`(`id_tecnico`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Maquina` ADD CONSTRAINT `Maquina_id_lotto_fkey` FOREIGN KEY (`id_lotto`) REFERENCES `Lotto`(`id_lotto`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Test` ADD CONSTRAINT `Test_id_maquina_fkey` FOREIGN KEY (`id_maquina`) REFERENCES `Maquina`(`id_maquina`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Test` ADD CONSTRAINT `Test_id_tecnico_fkey` FOREIGN KEY (`id_tecnico`) REFERENCES `Tecnico`(`id_tecnico`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_aprobado_por_fkey` FOREIGN KEY (`aprobado_por`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ordine` ADD CONSTRAINT `Ordine_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `Usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdineItem` ADD CONSTRAINT `OrdineItem_id_ordine_fkey` FOREIGN KEY (`id_ordine`) REFERENCES `Ordine`(`id_ordine`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdineItem` ADD CONSTRAINT `OrdineItem_id_materiale_fkey` FOREIGN KEY (`id_materiale`) REFERENCES `Materiale`(`id_materiale`) ON DELETE RESTRICT ON UPDATE CASCADE;
