CREATE DATABASE OutfitMatch;
GO
USE OutfitMatch;
GO

-- =========================
-- STAFF
-- =========================
CREATE TABLE StaffUsuarios (
  Id INT IDENTITY PRIMARY KEY,
  Nombres NVARCHAR(100) NOT NULL,
  Email NVARCHAR(150) NOT NULL UNIQUE,
  PasswordHash NVARCHAR(255) NOT NULL,
  Rol NVARCHAR(30) DEFAULT 'staff',
  Activo BIT DEFAULT 1,
  FechaRegistro DATETIME2 DEFAULT SYSDATETIME()
);

-- =========================
-- CLIENTES
-- =========================
CREATE TABLE Clientes (
  Id INT IDENTITY PRIMARY KEY,
  Nombres NVARCHAR(80) NOT NULL,
  Apellidos NVARCHAR(80) NOT NULL,
  Email NVARCHAR(150),
  Telefono NVARCHAR(30),
  FechaCreacion DATETIME2 DEFAULT SYSDATETIME()
);

-- =========================
-- FOTO CLIENTE
-- =========================
CREATE TABLE ClienteFotos (
  Id INT IDENTITY PRIMARY KEY,
  ClienteId INT NOT NULL,
  FotoBase64 NVARCHAR(MAX) NOT NULL,
  Fecha DATETIME2 DEFAULT SYSDATETIME(),
  FOREIGN KEY (ClienteId) REFERENCES Clientes(Id)
);

-- =========================
-- PERFIL / ENCUESTA
-- =========================
CREATE TABLE PerfilCliente (
  Id INT IDENTITY PRIMARY KEY,
  ClienteId INT UNIQUE NOT NULL,

  EstaturaCm INT,
  HombrosCm DECIMAL(5,2),
  PechoCm DECIMAL(5,2),
  CinturaCm DECIMAL(5,2),
  CaderaCm DECIMAL(5,2),

  TonoPiel NVARCHAR(30),
  Ocasion NVARCHAR(40),
  EstiloPreferido NVARCHAR(50),

  TipoCuerpo NVARCHAR(40),
  FechaActualizacion DATETIME2 DEFAULT SYSDATETIME(),

  FOREIGN KEY (ClienteId) REFERENCES Clientes(Id)
);

-- =========================
-- TIPOS DE CUERPO
-- =========================
CREATE TABLE TiposCuerpo (
  Codigo NVARCHAR(40) PRIMARY KEY,
  Nombre NVARCHAR(80),
  ImagenUrl NVARCHAR(200)
);

INSERT INTO TiposCuerpo VALUES
('pera','Pera','assets/bodytypes/pera.png'),
('manzana','Manzana','assets/bodytypes/manzana.png'),
('reloj_arena','Reloj de arena','assets/bodytypes/reloj_arena.png'),
('rectangulo','Rectángulo','assets/bodytypes/rectangulo.png'),
('triangulo_invertido','Triángulo invertido','assets/bodytypes/triangulo_invertido.png');

-- =========================
-- CATÁLOGO
-- =========================
CREATE TABLE Prendas (
  Id INT IDENTITY PRIMARY KEY,
  Nombre NVARCHAR(120),
  Categoria NVARCHAR(50),
  Color NVARCHAR(40),
  Precio DECIMAL(10,2),
  ImagenUrl NVARCHAR(300),
  OverlayUrl NVARCHAR(300),
  Stock INT,
  Activo BIT DEFAULT 1
);

CREATE TABLE Tags (
  Id INT IDENTITY PRIMARY KEY,
  Nombre NVARCHAR(80) UNIQUE,
  Tipo NVARCHAR(30)
);

CREATE TABLE PrendaTags (
  PrendaId INT,
  TagId INT,
  PRIMARY KEY (PrendaId, TagId),
  FOREIGN KEY (PrendaId) REFERENCES Prendas(Id),
  FOREIGN KEY (TagId) REFERENCES Tags(Id)
);

-- =========================
-- TRY ON RESULTADOS
-- =========================
CREATE TABLE TryOnResultados (
  Id INT IDENTITY PRIMARY KEY,
  ClienteId INT,
  PrendaId INT,
  ImagenResultadoBase64 NVARCHAR(MAX),
  Fecha DATETIME2 DEFAULT SYSDATETIME(),
  FOREIGN KEY (ClienteId) REFERENCES Clientes(Id),
  FOREIGN KEY (PrendaId) REFERENCES Prendas(Id)
);
GO
