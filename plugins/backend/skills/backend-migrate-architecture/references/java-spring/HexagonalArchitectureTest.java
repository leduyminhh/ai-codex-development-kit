package com.example.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

// Mẫu ArchUnit cho Hexagonal (ports & adapters). Đổi "com.example" cho khớp project.
@AnalyzeClasses(packages = "com.example", importOptions = ImportOption.DoNotIncludeTests.class)
class HexagonalArchitectureTest {

    // Lõi (domain + application/ports) KHÔNG được phụ thuộc adapter.
    @ArchTest
    static final ArchRule loiKhongPhuThuocAdapter = noClasses()
            .that().resideInAnyPackage("..domain..", "..application..")
            .should().dependOnClassesThat()
            .resideInAnyPackage("..infrastructure.inbound..", "..infrastructure.outbound..");

    // Adapter outbound hiện thực port; adapter không phụ thuộc lẫn nhau.
    @ArchTest
    static final ArchRule adapterKhongVongLan = slices()
            .matching("..infrastructure.(*)..")
            .should().notDependOnEachOther();

    // Mapper (MapStruct) chỉ ở infrastructure, không lọt vào domain/application.
    @ArchTest
    static final ArchRule mapperChiONgoai = classes()
            .that().haveSimpleNameEndingWith("Mapper")
            .should().resideInAPackage("..infrastructure..");
}
