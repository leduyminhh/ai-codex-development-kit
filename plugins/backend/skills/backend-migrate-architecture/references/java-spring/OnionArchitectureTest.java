package com.example.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.onionArchitecture;

// Mẫu ArchUnit cho Onion+DDD. Đổi "com.example" thành base package thật của project.
@AnalyzeClasses(packages = "com.example", importOptions = ImportOption.DoNotIncludeTests.class)
class OnionArchitectureTest {

    @ArchTest
    static final ArchRule onion = onionArchitecture()
            .domainModels("..domain.model..")
            .domainServices("..domain.service..")
            .applicationServices("..application..")
            .adapter("persistence", "..infrastructure.persistence..")
            .adapter("web", "..infrastructure.web..");

    @ArchTest
    static final ArchRule domainDocKhongPhuThuocHaTang = noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat()
            .resideInAnyPackage("..infrastructure..", "..application..");

    // Mapper (MapStruct) chỉ ở infrastructure, không lọt vào domain/application.
    @ArchTest
    static final ArchRule mapperChiONgoai = classes()
            .that().haveSimpleNameEndingWith("Mapper")
            .should().resideInAPackage("..infrastructure..");
}
