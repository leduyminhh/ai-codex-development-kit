package com.example.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

// Mẫu ArchUnit cho Hexagonal/Clean + CQRS. Đổi "com.example" cho khớp project.
@AnalyzeClasses(packages = "com.example", importOptions = ImportOption.DoNotIncludeTests.class)
class CqrsArchitectureTest {

    // Luồng đọc (query) KHÔNG đi qua aggregate lệnh (command) và ngược lại.
    @ArchTest
    static final ArchRule queryKhongChamCommand = noClasses()
            .that().resideInAPackage("..application.query..")
            .should().dependOnClassesThat().resideInAPackage("..application.command..");

    @ArchTest
    static final ArchRule commandKhongChamQuery = noClasses()
            .that().resideInAPackage("..application.command..")
            .should().dependOnClassesThat().resideInAPackage("..application.query..");

    // Domain vẫn độc lập hạ tầng.
    @ArchTest
    static final ArchRule domainDocLap = noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAPackage("..infrastructure..");

    // Mọi *Mapper (MapStruct phía ghi, RowMapper phía đọc) đều phải ở infrastructure, không lọt vào domain/application.
    @ArchTest
    static final ArchRule mapperChiONgoai = classes()
            .that().haveSimpleNameEndingWith("Mapper")
            .should().resideInAPackage("..infrastructure..");
}
